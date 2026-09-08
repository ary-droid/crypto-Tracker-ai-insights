import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import styles from "../../styles/HomeComnponent.module.css"
import { FaSearch } from "react-icons/fa"
import { AiFillDollarCircle, AiOutlineStar, AiFillDelete } from "react-icons/ai"
import { RxCrossCircled, RxCross1 } from "react-icons/rx"
import { FiTrendingDown } from "react-icons/fi"
import { FiTrendingUp } from "react-icons/fi"
import { AiFillCaretDown } from "react-icons/ai"
import { AiOutlineDollarCircle, AiFillStar } from "react-icons/ai"
import { BiRupee } from "react-icons/bi"
import { useToast } from '@chakra-ui/react'
import { favouritesActions } from "../../ReduxStore/FavouritesSlice";
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import {
    Drawer,
    DrawerBody,
    DrawerFooter,
    DrawerHeader,
    DrawerOverlay,
    DrawerContent,
    DrawerCloseButton,
    DrawerContentProps,
    DrawerProps,

} from '@chakra-ui/react'
import { useDisclosure } from '@chakra-ui/react';
import { HiOutlineArrowsUpDown } from "react-icons/hi2"
import { Tooltip } from '@chakra-ui/react'
import Footer from './Footer';
import Link from 'next/link';

type topCoinObj = {
    coinName: string,
    image: string,
    percentChange: number,
    current_price: number,
    id: string,
    symbol: string,
    price_change_percentage_24h: number,
    market_cap: number,
    total_volume: number
}


type CryptoCoin = {
    id: string;
    price: number;
    image: string;
    name: string;
};

const HomeComnponent = () => {

    const [cryptoData, setCryptoData] = useState<topCoinObj[]>([]);  // all coins
    const [filteredArray, setFilteredArray] = useState<topCoinObj[]>([]); // all coins
    const [seacrhTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState<number>(1);
    const [active, setActive] = useState(1);
    const [currencyModal, setCurrecnyModal] = useState(false);
    const [currency, setCurrency] = useState("usd");
    const [metaverseCoins, setMetavserseCoins] = useState<topCoinObj[]>([]) // metaverse coins
    const [metaverseFilter, setMetaverseFilter] = useState<topCoinObj[]>([]); // metaverse coins

    const [gamingCoins, setGamingCoins] = useState<topCoinObj[]>([]) // gaimng
    const [gamingFilter, setGamingFilter] = useState<topCoinObj[]>([]) // gaimng

    const [originalARR, setOriginalARR] = useState([]);
    const [tabState, setTabState] = useState("all coins");


    const pages = [1, 2, 3, 4];

    const reduxFavouritesARR: any[] = useSelector((state: any) => state.favourites.list);
    const toast = useToast();
    const dispacth = useDispatch();

    // AI insights state
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState<string | null>(null);

    const getAIInsights = async () => {
        if (!reduxFavouritesARR || reduxFavouritesARR.length === 0) {
            toast({ title: "No holdings", description: "Add favourites/holdings first", status: "info", duration: 2000, isClosable: true });
            return;
        }

        try {
            setAiLoading(true);
            setAiResult(null);
            const payload = { holdings: reduxFavouritesARR };
            const response = await axios.post('/api/ai-insights', payload);
            if (response.data?.insight) {
                setAiResult(response.data.insight);
            } else {
                setAiResult('No insight returned from AI.');
            }
        } catch (err) {
            console.error('AI insights error', err);
            toast({ title: 'AI failed', description: 'Could not fetch AI insights', status: 'error', duration: 3000, isClosable: true });
        } finally {
            setAiLoading(false);
        }
    };

    // Natural language query state
    const [nlQuery, setNlQuery] = useState<string>("");
    const [nlLoading, setNlLoading] = useState(false);
    const [nlResults, setNlResults] = useState<any[] | null>(null);
    const [nlError, setNlError] = useState<string | null>(null);

    const runNlQuery = async () => {
        if (!nlQuery || nlQuery.trim().length === 0) {
            toast({ title: 'Enter a query', status: 'info', duration: 1500, isClosable: true });
            return;
        }

        try {
            setNlLoading(true);
            setNlResults(null);
            setNlError(null);

            // Prepare lightweight coin payload to send
            const coinsPayload = cryptoData.map((c: any) => ({
                id: c.id,
                symbol: c.symbol,
                current_price: c.current_price,
                price_change_percentage_24h: c.price_change_percentage_24h,
                price_change_percentage_7d_in_currency: (c as any).price_change_percentage_7d_in_currency ?? (c as any).price_change_percentage_7d ?? null,
                market_cap: c.market_cap,
                total_volume: c.total_volume
            }));

            const holdingsPayload = reduxFavouritesARR.map((h: any) => ({ id: h.id, price: h.price, quantity: h.quantity ?? 0 }));

            const resp = await axios.post('/api/nl-query', { query: nlQuery, coins: coinsPayload, holdings: holdingsPayload });
            if (resp.data?.success) {
                setNlResults(resp.data.results || []);
            } else {
                setNlError(resp.data?.error || 'Failed to run query');
                // if LLM returned raw output for debugging, include it
                if (resp.data?.raw) console.debug('NL raw:', resp.data.raw);
            }
        } catch (err: any) {
            console.error('NL query error', err);
            setNlError('Unexpected error running query');
        } finally {
            setNlLoading(false);
        }
    };


    //fecthnig data
    useEffect(() => {
        // all coins
        fetch(
            `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency.toLowerCase()}&order=market_cap_desc&per_page=80&page=1&sparkline=false`
        )
            .then((response) => response.json())
            .then((data) => {
                setCryptoData(data)
                setOriginalARR(data);
                setFilteredArray(data);
            })
            .catch((error) => {
                // Handle error
                throw new Error('Error fetching all coins: ' + error);
            });

        // metaverse
        fetch(
            `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency.toLowerCase()}&category=metaverse&order=market_cap_desc&per_page=80&page=1&sparkline=false`
        )
            .then((response) => response.json())
            .then((data) => {
                setMetavserseCoins(data)
                setMetaverseFilter(data)
            })
            .catch((error) => {
                // Handle error
                throw new Error('Error fetching metaverse coins: ' + error);
            });

        // gaming
        /* fetch(
             `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency.toLowerCase()}&category=gaming&order=market_cap_desc&per_page=80&page=1&sparkline=false`
         )
             .then((response) => response.json())
             .then((data) => {
                 setGamingCoins(data)
                 setGamingFilter(data)
             })
             .catch((error) => {
                 // Handle error
                 throw new Error('Error fetching gaming coins: ' + error);
             });*/

    }, [currency]);




    const searchHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
        const searchTerm = e.target.value;
        setSearchTerm(searchTerm);

        // search for all coins
        if (tabState === "all coins") {

            if (filteredArray.length > 0) {
                const mutateArr = filteredArray.filter((item) => {
                    const coinName = item.id.toLowerCase().includes(searchTerm.toLowerCase());
                    const coinSymbol = item.symbol.toLowerCase().includes(searchTerm.toLowerCase());

                    return coinName || coinSymbol
                });

                setCryptoData(mutateArr);

                // Reset the active page to the first page
                setActive(1);
                setPage(1);
            }
        }

        // search for metaverse

        else if (tabState === "metaverse") {

            if (metaverseFilter.length > 0) {
                const mutateArr = metaverseFilter.filter((item) => {
                    const coinName = item.id.toLowerCase().includes(searchTerm.toLowerCase());
                    const coinSymbol = item.symbol.toLowerCase().includes(searchTerm.toLowerCase());

                    return coinName || coinSymbol
                });

                setCryptoData(mutateArr);

                // Reset the active page to the first page
                setActive(1);
                setPage(1);
            }
        }

        // search for gaming


        else if (tabState === "gaming") {

            if (gamingFilter.length > 0) {
                const mutateArr = gamingFilter.filter((item) => {
                    const coinName = item.id.toLowerCase().includes(searchTerm.toLowerCase());
                    const coinSymbol = item.symbol.toLowerCase().includes(searchTerm.toLowerCase());

                    return coinName || coinSymbol
                });

                setCryptoData(mutateArr);

                // Reset the active page to the first page
                setActive(1);
                setPage(1);
            }
        }



    };


    // redux methods
    const addToFavouritesHandler = (coin: topCoinObj) => {

        dispacth(favouritesActions.addToFavourites(coin));

        toast({
            title: "",
            description: "Added Successfully",
            status: "success",
            duration: 1500,
            isClosable: true,
        });
    }

    const removeFromFavHandler = (coin: topCoinObj) => {
        dispacth(favouritesActions.removeFromFavourites(coin))
    }



    // currecny modal
    const currencyModalToggle = () => {
        setCurrecnyModal(!currencyModal)
    }


    // tabs change 
    const metaVerseCategrotyHandler = () => {
        setCryptoData(metaverseCoins)
        setTabState("metaverse")
    }

    const gamingCoinsCategoryHandler = () => {
        setCryptoData(gamingCoins)
        setTabState("gaming")
    }

    const allCoinsHandler = () => {
        setCryptoData(originalARR)
        setTabState("all coins")
    }

    // add to favourites drawer 
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [sortOrder, setSortOrder] = useState('none');


    const lowTOhighHanler = () => {

        const sortedData = [...cryptoData].sort((a, b) => a.current_price - b.current_price);
        setCryptoData(sortedData);
    }

    const highTOlowHandler = () => {
        const sortedData = [...cryptoData].sort((a, b) => b.current_price - a.current_price);
        setCryptoData(sortedData);
    }


    const MyDrawerContent: React.FC<DrawerProps> = ({ children }) => {
        // Your implementation here
        return <DrawerContent>{children}</DrawerContent>
    };

    const MyDrawerBody: React.FC<DrawerProps> = ({ children }) => {
        // Your implementation here
        return <DrawerBody>{children}</DrawerBody>
    };


    return (

        <div>
            { /*OPTIONS HEADER */}

            {  /* SEARCH BAR */}
            <div className="flex flex-col items-center justify-center w-full gap-4">

                <div className='flex flex-col md:flex-row items-center gap-4 tableHeaderChild1 md:justify-center w-full'>

                    <div className='mt-3 w-full md:w-auto flex items-center'>
                        <input
                            type="text"
                            placeholder="Search"
                            value={seacrhTerm}
                            onChange={searchHandler}
                            className="px-4 py-2 pl-7 boxsh rounded-md relative z-50 bg-transparent border-2 border-gray-200 text-gray-600 focus:outline-none w-full md:w-64"
                        />
                        <FaSearch className="search-icon relative -ml-8 text-gray-400 text-sm w-3 -z-1" />
                    </div>

                    <div onClick={currencyModalToggle} className=" items-center gap-2 hidden lg:flex cursor-pointer border rounded w-64 justify-center h-10">
                        <p>Currency</p>
                        <AiFillCaretDown className='' />
                    </div>

                    {  /* CUURRECYY */}

                    <div className={"  w38rem hidden lg:block"}>
                        {currencyModal && <div className={styles.currencyModalHold}>
                            <div>

                                <div className=' flex font-semibold gap-3 items-center cursor-pointer mb-7'>
                                    <AiOutlineDollarCircle className='text-xl font-semibold' />
                                    <p onClick={() => setCurrency("usd")}> USD </p>
                                </div>

                                <div className=' flex font-semibold gap-3 items-center cursor-pointer'>
                                    <BiRupee className='text-xl font-semibold' />
                                    <p onClick={() => setCurrency("inr")}> INR </p>
                                </div>
                            </div>

                        </div>

                        }
                    </div>
                </div>

                { /* FLTER TABS */}
                <div className='flex gap-8 flex-wrap items-center ml-2 md:justify-center justify-around mt-5 md:mt-0'>
                    <p className={`${tabState === "all coins" ? "flex justify-center items-center w-24 h-9 rounded-md border border-black cursor-pointer interFont scalee" : "flex justify-center items-center w-24 h-9 rounded-md greyBackground cursor-pointer interFont scalee"}`} onClick={allCoinsHandler}> All Coins </p>
                    <p className={`${tabState === "metaverse" ? "flex justify-center items-center w-24 h-9 rounded-md border border-black cursor-pointer interFont scalee" : "flex justify-center items-center w-24 h-9 rounded-md greyBackground cursor-pointer interFont scalee"}`} onClick={metaVerseCategrotyHandler}> Metaverse </p>
                    {  /* <p className={`${tabState === "gaming" ? "flex justify-center items-center w-24 h-9 rounded-md border border-black cursor-pointer interFont scalee" : "flex justify-center items-center w-24 h-9 rounded-md greyBackground cursor-pointer interFont scalee"}`} onClick={gamingCoinsCategoryHandler}> Gaming </p> */}
                    <p className='flex justify-center items-center w-32 h-9 rounded-md greyBackground cursor-pointer interFont scalee gap-2' onClick={onOpen}>  <AiOutlineStar className='text-xl' /> Favourites </p>
                </div>

                {/* Natural language query row placed under tabs */}
                <div className='w-full flex justify-center mt-5'>
                    <div className='w-full md:w-3/4 lg:w-1/2 flex items-center mt-2'>
                        <input
                            type='text'
                            placeholder='Ask in natural language (e.g. "Show me coins I own down >5% this week")'
                            value={nlQuery}
                            onChange={(e) => setNlQuery(e.target.value)}
                            className='px-4 py-2 rounded-md bg-white border-2 border-gray-200 text-gray-700 w-full'
                        />
                        <button onClick={runNlQuery} disabled={nlLoading} className='ml-2 px-3 py-2 bg-black text-white rounded self-start'>
                            {nlLoading ? 'Searching...' : 'Ask'}
                        </button>
                    </div>
                </div>

            </div>

            <br />

            {  /* MAIN CRYPTO TABLE  */}


            <div className="overflow-x-auto">
                {cryptoData.length === 0 ?
                    <p className=' font-semibold flex justify-center items-center mb-4 gap-2'>
                        No Results Found  <RxCrossCircled className=' font-bold align-middle text-2xl text-red-600' />
                    </p>
                    :
                    <>
                        <table className="table cryptoDataMainTable mx-auto w-full">
                            {/* head */}
                        {/* head */}
                        <thead>
                            <tr>
                                <th></th>
                                <th className='metaverse-table'>Coin</th>
                                <th>
                                    <Tooltip label='Low To High' className='md:mr-20'>
                                        <span id='lowTOhigh' className='flex items-center gap-1 cursor-pointer' onClick={lowTOhighHanler}>Price
                                            <HiOutlineArrowsUpDown className='text-xl' />
                                        </span>
                                    </Tooltip>
                                </th>

                                <th>total volume</th>

                                <th>
                                    <Tooltip label='High To Low' className='md:mr-28'>
                                        <span id='highTOlow' className='flex items-center gap-1 cursor-pointer' onClick={highTOlowHandler}>Market Cap
                                            <HiOutlineArrowsUpDown className='text-xl rotate-180' />
                                        </span>
                                    </Tooltip>
                                </th>
                                <th>Price Change</th>
                            </tr>
                        </thead>

                        <tbody>
                            {/* rows */}
                            {cryptoData.slice(page * 20 - 20, page * 20).map((coin, index) => (
                                <tr key={coin.id}>
                                    <th>
                                        <div className='w-8 h-8 cursor-pointer'>
                                            <AiOutlineStar className='sm:text-xl text-xl text-gray-500 hover:text-yellow-500 transition-all ease-in'
                                                onClick={() => addToFavouritesHandler(coin)}
                                            />
                                        </div>
                                    </th>
                                    <td className='py-6 cursor-pointer'>
                                        <Link href={`/${coin.id}`}>
                                            <img src={coin.image} className="sm:w-12 sm:h-12 w-9 h-9 inline-block mr-2" alt="ada" />
                                            <span className='font-semibold inline-block align-middle uppercase sm:text-base text-sm mr-4'>{coin.id.substring(0, 18)}</span>
                                        </Link>
                                    </td>
                                    <td className=' font-semibold py-6 sm:text-base text-sm'> {currency == "usd" ? "$" : <BiRupee className=' inline-block'></BiRupee>} {coin.current_price.toLocaleString()}</td>
                                    <td className=' font-semibold pl-6 sm:text-base text-sm'>{coin.total_volume.toLocaleString()}</td>
                                    <td className=' font-semibold text-gray-500 py-6 sm:text-base text-sm'> {currency == "usd" ? "$" : <BiRupee className=' inline-block'></BiRupee>} {coin.market_cap.toLocaleString()}</td>
                                    <td className={coin.price_change_percentage_24h > 0 ? "text-green-600 sm:text-base text-sm font-semibold py-6 inline-block align-middle" : "text-red-600 font-semibold py-6 inline-block align-middle"}> <span className=' inline-block align-middle'> {coin.price_change_percentage_24h > 0 ? <FiTrendingUp className='text-semibold text-xl text-green-600' /> : <FiTrendingDown className='text-semibold text-xl text-red-600' />} </span> {coin.price_change_percentage_24h != null ? coin.price_change_percentage_24h.toFixed(2) : "N/A"}%</td>
                                </tr>
                            ))}
                        </tbody>

                    </table>

                        {/* Natural language query results */}
                        <div className='mt-4 mx-auto w-11/12'>
                            <h3 className='font-semibold mb-2'>Query Results</h3>
                            {nlLoading ? (
                                <p>Searching...</p>
                            ) : nlError ? (
                                <p className='text-red-600'>{nlError}</p>
                            ) : nlResults && nlResults.length === 0 ? (
                                <p className='text-gray-600'>No matching coins found.</p>
                            ) : nlResults ? (
                                <div className='grid grid-cols-1 gap-2'>
                                    {nlResults.slice(0, 10).map((r: any) => (
                                        <div key={r.id} className='p-2 border rounded flex items-center justify-between'>
                                            <div>
                                                <p className='font-semibold uppercase'>{r.id}</p>
                                                <p className='text-sm text-gray-600'>Price: {currency == 'usd' ? '$' : ''}{r.current_price?.toLocaleString?.() ?? r.current_price}  •  24h: {r.price_change_percentage_24h ?? 'N/A'}%</p>
                                            </div>
                                            <div className='flex items-center gap-2'>
                                                <button className='px-3 py-1 bg-black text-white rounded' onClick={() => addToFavouritesHandler(r)}>Star</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </>

                }
            </div>

            <div className="w80 mx-auto bg-gray-100 mt-4"></div>
            <br />
            <br />
            <br />

            {  /* PAGINATION */}
            <div className='flex gap-4 flex-wrap justify-center'>
                {pages.map((item) => {

                    return (
                        <p key={item} className={active == item ? "bg-black text-white indivitualPage2 font-semibold cursor-pointer" : "indivitualPage font-semibold cursor-pointer"} onClick={(e) => {
                            if (e.target instanceof HTMLParagraphElement) {
                                setPage(parseInt(e.target.innerText) || 0);
                                setActive(parseInt(e.target.innerText) || 0);

                            }

                        }}>
                            {item}
                        </p>
                    )

                })}
            </div>


            <br />
            <br />
            <br />

            {  /*  FAVOURITES DRAWER */}

            <Drawer onClose={onClose} isOpen={isOpen}>
                <DrawerOverlay />
                <DrawerContent>
                    <DrawerHeader borderBottomWidth='1px'> <div className='flex gap-2'>  <span className='font-semibold'>Favourites</span> <AiFillStar className='golden font-bold text-3xl' /> </div> </DrawerHeader>
                    <DrawerBody>
                        <br />

                        <div className='flex flex-col gap-6'>

                            {reduxFavouritesARR.length === 0 ? <p className=' font-semibold'> Nothing Here Yet </p> :
                                reduxFavouritesARR.map((item: any) => {
                                    return (
                                        <div key={item.id} className='flex items-center justify-between gap-4'>
                                            <div className='flex gap-2 items-center'>
                                                <img src={item.image} className="w-12 h-12" alt={item.name} />
                                                <div className='flex flex-col'>
                                                    <p className='font-semibold text-sm sm:text-base uppercase'> {item.name} </p>
                                                    <p className=' text-sm text-gray-600 font-semibold'> {currency == "usd" ? "$" : <BiRupee className=' inline-block'></BiRupee>} {Number(item.price).toLocaleString()} </p>
                                                </div>
                                            </div>

                                            <div className='flex items-center gap-3'>
                                                <input
                                                    type='number'
                                                    min={0}
                                                    value={item.quantity ?? 1}
                                                    onChange={(e) => dispacth(favouritesActions.updateQuantity({ id: item.id, quantity: Number(e.target.value) }))}
                                                    className='w-20 p-1 border rounded text-sm'
                                                />

                                                <RxCrossCircled className='text-lg cursor-pointer' onClick={() => removeFromFavHandler(item)} />
                                            </div>
                                        </div>
                                    )
                                })
                            }

                            <div className='flex flex-col gap-3 mt-4'>
                                <button onClick={getAIInsights} disabled={aiLoading} className='bg-black text-white px-4 py-2 rounded w-44'>
                                    {aiLoading ? 'Generating...' : 'Get AI Insights'}
                                </button>

                                {aiResult && (
                                    <div className='mt-2 p-3 bg-gray-50 border rounded text-sm'>
                                        <strong>AI Insight:</strong>
                                        <p className='mt-2 whitespace-pre-wrap'>{aiResult}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </DrawerBody>
                </DrawerContent>
            </Drawer>

            {   /* FOOTER  */}

            <Footer />




        </div>
    )
}

export default HomeComnponent
